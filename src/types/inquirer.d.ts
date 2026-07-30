declare module 'inquirer' {
  interface Answers {
    [key: string]: any;
  }

  interface Question<T extends Answers = Answers> {
    type?: string;
    name: string;
    message: string | ((answers: T) => string);
    default?: any;
    choices?: Array<{ name: string; value: any } | string>;
    validate?: (input: any) => boolean | string | Promise<boolean | string>;
    when?: boolean | ((answers: T) => boolean | Promise<boolean>);
    [key: string]: any;
  }

  function prompt<T extends Answers>(questions: Question<T> | Array<Question<T>>): Promise<T>;

  export default { prompt };
}
